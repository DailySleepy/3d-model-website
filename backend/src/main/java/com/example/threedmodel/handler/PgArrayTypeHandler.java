package com.example.threedmodel.handler;

import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedTypes;

import java.sql.Array;
import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@MappedTypes(String[].class)
public class PgArrayTypeHandler extends BaseTypeHandler<String[]> {

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, String[] parameter, JdbcType jdbcType)
            throws java.sql.SQLException {
        Array array = ps.getConnection().createArrayOf("varchar", parameter);
        ps.setArray(i, array);
    }

    @Override
    public String[] getNullableResult(ResultSet rs, String columnName) throws java.sql.SQLException {
        Array array = rs.getArray(columnName);
        return array == null ? null : (String[]) array.getArray();
    }

    @Override
    public String[] getNullableResult(ResultSet rs, int columnIndex) throws java.sql.SQLException {
        Array array = rs.getArray(columnIndex);
        return array == null ? null : (String[]) array.getArray();
    }

    @Override
    public String[] getNullableResult(CallableStatement cs, int columnIndex) throws java.sql.SQLException {
        Array array = cs.getArray(columnIndex);
        return array == null ? null : (String[]) array.getArray();
    }
}
